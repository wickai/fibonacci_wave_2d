import csv·

def fibonacci_alpha_s(m):
    """返回 alpha(m) 和 s(m)"""
    F0, F1 = 0, 1
    n = 1
    while True:
        F = (F0 + F1) % m
        if F == 0:
            alpha = n + 1       # F_alpha ≡ 0
            # 此时：F0 包含 F_{n-1}，F1 包含 F_n，F 包含 F_{n+1} (即 F_alpha)
            # 我们需要 s = F_{alpha+1} % m = F_{(n+1)+1} % m = F_{n+2} % m
            # 根据斐波那契数列定义：F_{n+2} = F_{n+1} + F_n
            # 所以 s = (F + F1) % m
            s = (F + F1) % m
            break
        F0, F1 = F1, F
        n += 1
    return alpha, s

def order_mod(a, m):
    """计算 a 的阶 β(m)"""
    if a == 0:
        return None  # 0 的阶是未定义的
    power = a % m
    beta = 1··
    while power != 1:
        power = (power * a) % m
        beta += 1
    return beta

def pisano_period(m):
    """计算皮亚诺周期 π(m)"""
    F0, F1 = 0, 1
    # 皮亚诺周期最大为 m*m。迭代到 m*m+1 可以确保找到它。
    for i in range(0, m*m+1):
        F0, F1 = F1, (F0 + F1) % m
        if F0 == 0 and F1 == 1:
            return i + 1
    return None # 对于 m > 1 不应该发生，但作为安全措施。

# 生成 CSV
with open("fibonacci_mod_fixed.csv", "w", newline="") as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["m", "alpha(m)", "s(m)", "beta(m)", "pisano_period(m)"])

    for m in range(3, 1000):  # 2 < m < 1000
        alpha, s = fibonacci_alpha_s(m)
        beta = order_mod(s, m)
        pi = pisano_period(m)
        writer.writerow([m, alpha, s, beta, pi])

print("CSV 已生成：fibonacci_mod_fixed.csv")